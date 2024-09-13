import express from 'express';
import { detectAndConfirmContractType, analyzeContract, getUserContracts, uploadMiddleware, addUserFeedback, getContractById, askQuestionAboutContract, deleteContractById } from '../controllers/contractController';
import { isAuthenticated, handleErrors } from '../middleware/auth';
import { checkPremium } from '../middleware/checkPremium';
import { analyzeRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.post("/detect-type", isAuthenticated, uploadMiddleware, handleErrors(detectAndConfirmContractType));
router.post("/analyze", isAuthenticated, analyzeRateLimiter, uploadMiddleware, handleErrors(analyzeContract));
router.get("/user-contracts", isAuthenticated, handleErrors(getUserContracts));
router.get("/contract/:id", isAuthenticated, handleErrors(getContractById));
router.post("/feedback/:contractId", isAuthenticated, checkPremium, handleErrors(addUserFeedback));
router.post('/contract/:contractId/ask', isAuthenticated, checkPremium, handleErrors(askQuestionAboutContract));
router.delete("/contract/:id", isAuthenticated, handleErrors(deleteContractById));

export default router;