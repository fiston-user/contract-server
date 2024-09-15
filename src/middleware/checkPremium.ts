import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

export const checkPremium = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as IUser;
  if (user && user.isPremium) {
    next();
  } else {
    res.status(403).json({ error: 'This feature is only available for premium users' });
  }
};