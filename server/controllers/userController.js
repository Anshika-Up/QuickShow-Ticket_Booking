import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

//controller to get all bookings of a particular user
export const getUserBookings= async (req, res)=>{
  try{

    const user = req.auth().userId;

    const bookings= await Booking.find({user}).populate({
      path:"show",
      populate:{path:"movie"}
    }).sort({createdAt: -1})

    res.json({
      success:true, 
      bookings
    })

  }catch(error){
    console.log("error while fetching Your Booking")
    res.json({
      success:false,
      message:error.message
    })
  }
}

// API controller for user to add any movie to favourite into clerk metadata

export const updateFavorite = async(req,res) =>{
  try{
    const userId= req.auth().userId;
    const {movieId}=req.body;

    //get user from clerk
    const user= await clerkClient.users.getUser(userId);

    //agr metadata me favorites property nhi hai to add it
    if(!user.privateMetadata.favorites){
      user.privateMetadata.favorites=[]
    }

    //movieId already added nhi hai to add it
    if(!user.privateMetadata.favorites.includes(movieId)){
      user.privateMetadata.favorites.push(movieId)
    }else{//else remove movie from favorite
      user.privateMetadata.favorites = user.privateMetadata.favorites.filter(id=> id !== movieId)
    }

    //update privateMetadata
    await clerkClient.users.updateUserMetadata(userId, {privateMetadata:user.privateMetadata})

    //return res
    res.json({
      success:true,
      message:"favorite movie updated"
    })
  }
  catch(error){
   res.json({
      success:false,
      message:error.message
    })
  } 
}

//API controller to get all favorites movie from user clerk metadata
export const getFavorites = async (req, res) =>{
  try{
    const userId = req.auth().userId;

    //find user
    const user= await clerkClient.users.getUser(userId);
    //find list of favorite movies(id)
    const favorites= user.privateMetadata.favorites;
    //get these movies from database
    const movies= await Movie.find({_id: {$in: favorites}})

    //return response
    res.json({ success:true, movies})

  }catch(error) {
    res.json({
      success:false,
      message:error.message
    })
  }
}