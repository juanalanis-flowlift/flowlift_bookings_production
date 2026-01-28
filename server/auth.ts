import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth Setup
  const googleClientID = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientID || !googleClientSecret) {
    console.error("WARNING: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables. Google authentication will not work until these are configured.");
  }

  if (googleClientID && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientID,
          clientSecret: googleClientSecret,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            const firstName = profile.name?.givenName;
            const lastName = profile.name?.familyName;
            const profileImageUrl = profile.photos?.[0]?.value;

            const googleUserId = `google:${profile.id}`;

            const user = await storage.upsertUser({
              id: googleUserId,
              email: email || null,
              firstName: firstName || null,
              lastName: lastName || null,
              profileImageUrl: profileImageUrl || null,
            });

            return done(null, { id: user.id });
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  }

  // Microsoft OAuth Setup
  const microsoftClientID = process.env.MICROSOFT_CLIENT_ID;
  const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!microsoftClientID || !microsoftClientSecret) {
    console.error("WARNING: Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET environment variables. Microsoft authentication will not work until these are configured.");
  }

  if (microsoftClientID && microsoftClientSecret) {
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: microsoftClientID,
          clientSecret: microsoftClientSecret,
          callbackURL: "/auth/microsoft/callback",
          scope: ["user.read"],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName;
            const firstName = profile.name?.givenName || profile._json?.givenName;
            const lastName = profile.name?.familyName || profile._json?.surname;
            const profileImageUrl = null; // Microsoft doesn't provide photo URL directly

            const microsoftUserId = `microsoft:${profile.id}`;

            const user = await storage.upsertUser({
              id: microsoftUserId,
              email: email || null,
              firstName: firstName || null,
              lastName: lastName || null,
              profileImageUrl: profileImageUrl,
            });

            return done(null, { id: user.id });
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  }

  // Serialize only the user ID to the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize by fetching the full user from the database
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Dev Login for Local Development
  app.get("/api/auth/dev", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).send("Not found");
    }

    try {
      // Create or get a test user
      const user = await storage.upsertUser({
        id: "dev-user",
        email: "dev@flowlift.co",
        firstName: "Dev",
        lastName: "User",
        profileImageUrl: null,
      });

      // Manually log them in
      req.login(user, (err) => {
        if (err) {
          console.error("Dev login error:", err);
          return res.redirect("/signin?error=login_failed");
        }
        return res.redirect("/dashboard");
      });
    } catch (error) {
      console.error("Dev auth error:", error);
      res.redirect("/signin?error=dev_auth_failed");
    }
  });

  // Google Auth Routes
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
    } as any)
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/signin?error=auth_failed",
    }),
    (req, res) => {
      res.redirect("/dashboard");
    }
  );

  // Microsoft Auth Routes
  app.get(
    "/auth/microsoft",
    passport.authenticate("microsoft", {
      prompt: "select_account",
    } as any)
  );

  app.get(
    "/auth/microsoft/callback",
    passport.authenticate("microsoft", {
      failureRedirect: "/signin?error=auth_failed",
    }),
    (req, res) => {
      res.redirect("/dashboard");
    }
  );

  // Legacy login redirect
  app.get("/api/login", (req, res) => {
    res.redirect("/signin");
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.json(req.user);
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  (req as any).user = {
    ...user,
    claims: {
      sub: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      profile_image_url: user.profileImageUrl,
    },
  };

  return next();
};
