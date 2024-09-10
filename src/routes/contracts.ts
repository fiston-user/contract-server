import express from 'express';
import { analyzeContract, getUserContracts, uploadMiddleware, addUserFeedback } from '../controllers/contractController';
import { isAuthenticated, handleErrors } from '../middleware/auth';
import { checkPremium } from '../middleware/checkPremium';

const router = express.Router();

router.post('/analyze', isAuthenticated, uploadMiddleware, handleErrors(analyzeContract));
router.get('/user-contracts', isAuthenticated, handleErrors(getUserContracts));
router.post('/feedback/:contractId', isAuthenticated, checkPremium, handleErrors(addUserFeedback));

// Add more premium-only routes here
// router.get('/premium-feature', isAuthenticated, checkPremium, handleErrors(premiumFeatureFunction));

export default router;