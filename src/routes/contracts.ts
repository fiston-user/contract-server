import express from 'express';
import { analyzeContract, getUserContracts, uploadMiddleware } from '../controllers/contractController';
import { isAuthenticated, handleErrors } from '../middleware/auth';

const router = express.Router();

router.post('/analyze', isAuthenticated, uploadMiddleware, handleErrors(analyzeContract));
router.get('/user-contracts', isAuthenticated, handleErrors(getUserContracts));

export default router;