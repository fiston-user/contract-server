import Project from "../models/Project";
import { IUser } from "../models/User";

export const createDefaultProject = async (user: IUser): Promise<void> => {
  try {
    const defaultProject = new Project({
      name: "My First Project",
      description: "Default project created upon registration",
      userId: user._id,
    });
    await defaultProject.save();
    console.log(`Default project created for user ${user._id}`);
  } catch (error) {
    console.error("Error creating default project:", error);
    throw error;
  }
};