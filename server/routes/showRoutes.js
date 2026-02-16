import express from 'express';
import { addShow, getShow, getShows, NowPlayingMovies } from '../controllers/showController.js';
import { protectAdmin } from '../middlewares/auth.js';

export const showRouter= express.Router();

showRouter.get('/now-playing',protectAdmin, NowPlayingMovies);
showRouter.post('/add',protectAdmin, addShow);

showRouter.get("/all",getShows);
showRouter.get("/:movieId",getShow)