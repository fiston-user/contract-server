import { Request, Response, NextFunction } from "express";

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("isAuthenticated called");
  console.log("Session ID:", req.sessionID);
  console.log("Session:", JSON.stringify(req.session, null, 2));
  console.log("User:", JSON.stringify(req.user, null, 2));
  console.log("Cookies:", req.cookies);
  console.log("Headers:", req.headers);
  console.log("isAuthenticated:", req.isAuthenticated());
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export const handleErrors = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
