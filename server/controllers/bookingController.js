import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js"
import stripe from 'stripe'


//function to check availability of selected seats by user for that show
const checkSeatsAvailability = async(showId, selectedSeats) =>{
  try{
    const showData= await Show.findById(showId)
    if(!showData) return false

    const occupiedSeats= showData.occupiedSeats;

    //.some() method will return true if condition is true for at least one element
    const isAnySeatTaken= selectedSeats.some(seat => occupiedSeats[seat])

    return !isAnySeatTaken;
  }catch(err){
    console.log(err.message);
    return false
  }
}

//controller for creating booking for a show
export const createBooking = async(req,res) =>{
  try{
    const {userId}=req.auth();
    const {showId,selectedSeats}=req.body;
    const {origin}=req.headers;

    //check seat is available or not
    const isAvailable= await checkSeatsAvailability(showId, selectedSeats);

    if(!isAvailable){
      return res.json({
        success:false,
        message:"Selected seats are not available."
      })
    }

    //get show details for getting price
    const showData= await Show.findById(showId).populate('movie');

    //create booking
    const booking = await Booking.create({
      user:userId,
      show:showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats:selectedSeats
    });

    //reserve selected seats and mark as occupied
    selectedSeats.map((seat)=>{
      showData.occupiedSeats[seat]=userId;
    })

    showData.markModified('occupiedSeats');

    await showData.save();

    // stripe Gateway Initialise
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)

    //creating line items for stripe
    const line_items= [{
      price_data:{
        currency : 'usd',
        product_data:{
          name: showData.movie.title
        },
        unit_amount : Math.floor(booking.amount) * 100
      },
      quantity: 1
    }]

    //creating payment session which will grenerate a payment link for some duration
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url:`${origin}/my-bookings` ,
      line_items: line_items,
      mode:"payment",
      metadata: {
        bookingId : booking._id.toString()
      },
      expires_at: Math.floor(Date.now()/1000) + 30*60, //expires in 30 min
    })

    //saved the paymentLink to database so that if user fails to pay at first , he/she can retry
    booking.paymentLink = session.url
    await booking.save();

    //run inngest schedular function to check paymnet after 10 minutes
    await inngest.send({
      name:"app/checkpayment",
      data:{
        bookingId: booking._id.toString()
      }
    })

    res.json({
      success:true,
      url:session.url,
      message:"booked successfully"
    })
  }catch(error){
    res.json({
      success:false,
      message:error.message
    })
  }
}

//controller to getoccupied Seats data

export const getOccupiedSeats = async(req, res) =>{
  try{
    const {showId}=req.params;
    const show= await Show.findById(showId)
    //get list of occupiedSeats 
    const occupiedSeats= Object.keys(show.occupiedSeats)

    res.json({
      success:true,
      occupiedSeats
    })
  }catch(err){
    res.json({
      success:false,
      message:err.message
    })
  }
}