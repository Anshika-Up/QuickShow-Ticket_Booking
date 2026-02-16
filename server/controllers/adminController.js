import User from "../models/User.js"
import Booking from "../models/Booking.js"
import Show from "../models/Show.js"

//controller to validate user is admin or not
export const isAdmin= async (req,res)=>{
  res.json({
    success:true,
    isAdmin:true
  })
}

//controller to get admin dashboard data
export const getDashBoardData= async(req, res)=>{
  try{
    const bookings= await Booking.find({isPaid:true});
    const totalUser= await User.countDocuments();
    const activeShows= await Show.find({showDateTime:{$gte: new Date()}}).populate('movie');

    const dashboardData= {
      totalBookings:bookings.length,
      totalRevenue:bookings.reduce((acc, booking)=> acc+booking.amount, 0),
      totalUser,
      activeShows
    }

    res.json({success:true, dashboardData});

  }catch(err){
    res.json({success:false, message:err.message})
  }
}

//controller to get all shows for admin page
export const getAllShows= async (req, res) =>{
  try{
    const shows= await Show.find({showDateTime: {$gte:new Date()}}).populate('movie').sort({showDateTime:1});

    res.json({success:true, shows});
    
  }catch(err){
    res.json({success:false, message:err.message})
  }
}
//controller to get all bookings for admin page
export const getAllBookings= async (req, res) =>{
  try{
    const bookings= await Booking.find({}).populate('user').populate({
      path:"show",
      populate:{ path:"movie"}
    }).sort({createdAt: -1})

    res.json({success:true, bookings});

  }catch(err){
    res.json({success:false, message:err.message})
  }
}