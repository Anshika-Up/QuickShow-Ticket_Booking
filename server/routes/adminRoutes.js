import express from "express"
import { getAllBookings, getAllShows, getDashBoardData, isAdmin } from "../controllers/adminController.js";
import { protectAdmin } from "../middlewares/auth.js";

export const adminRouter= express.Router();

adminRouter.get('/is-admin',protectAdmin,isAdmin)
adminRouter.get('/dashboard',protectAdmin,getDashBoardData)
adminRouter.get('/all-shows',protectAdmin,getAllShows)
adminRouter.get('/all-bookings',protectAdmin,getAllBookings)