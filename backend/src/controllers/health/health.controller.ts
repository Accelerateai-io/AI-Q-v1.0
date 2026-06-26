import type { Request, Response } from "express";

const healthCheck = async (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
};

export default healthCheck;