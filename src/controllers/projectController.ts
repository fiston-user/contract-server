import { Request, Response } from "express";
import Project from "../models/Project";
import User from "../models/User";
import { IUser } from "../models/User";
import { isValidObjectId } from "../utils/mongoUtils";

export const createProject = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const { name, description } = req.body;

  try {
    const projectCount = await Project.countDocuments({ userId: user._id });

    if (!user.isPremium && projectCount >= 2) {
      return res
        .status(403)
        .json({
          error:
            "Free users can only create two projects. Upgrade to premium for unlimited projects.",
        });
    }

    const newProject = new Project({
      name,
      description,
      userId: user._id,
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error creating project:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the project" });
  }
};

export const getUserProjects = async (req: Request, res: Response) => {
  const user = req.user as IUser;

  try {
    const projects = await Project.find({ userId: user._id });
    if (!projects) {
      return res.status(404).json({ error: "No projects found" });
    }
    res.json(projects);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching projects" });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const { projectId } = req.params;

  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid project ID format" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, userId: user._id });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the project" });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const { projectId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid project ID format" });
  }

  try {
    const project = await Project.findOneAndUpdate(
      { _id: projectId, userId: user._id },
      { name, description, updatedAt: new Date() },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the project" });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  const user = req.user as IUser;
  const { projectId } = req.params;

  if (!isValidObjectId(projectId)) {
    return res.status(400).json({ error: "Invalid project ID format" });
  }

  try {
    const project = await Project.findOneAndDelete({
      _id: projectId,
      userId: user._id,
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the project" });
  }
};
