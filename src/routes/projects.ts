import express from "express";
import { isAuthenticated, handleErrors } from "../middleware/auth";
import {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/projectController";

const router = express.Router();

router.post("/", isAuthenticated, handleErrors(createProject));
router.get("/", isAuthenticated, handleErrors(getUserProjects));
router.get("/:projectId", isAuthenticated, handleErrors(getProjectById));
router.put("/:projectId", isAuthenticated, handleErrors(updateProject));
router.delete("/:projectId", isAuthenticated, handleErrors(deleteProject));

export default router;