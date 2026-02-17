import sendEmail from '../config/nodemailer.js';
import Booking from '../models/Booking.js';
import Show from '../models/Show.js';
import User from '../models/User.js'
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking",apiKey: process.env.INNGEST_EVENT_KEY});

//inngest function to save user data from clerk to database

const syncUserCreation = inngest.createFunction(
  {id: 'sync-user-from-clerk'},
  {event: 'clerk/user.created'},
  async ({event}) =>{
      const {id, first_name, last_name, email_addresses, image_url}= event.data
      const userData= {
        _id:id,
        name:first_name+' '+last_name,
        email:email_addresses[0].email_address,
        image: image_url
      }

      await User.create(userData);
  }
)

//inngest function to delete user data from database
const syncUserDeletion = inngest.createFunction(
  {id:'delete-user-with-clerk'},
  {event:'clerk/user.deleted'},
  async ({event})=>{
    const {id}= event.data
    await User.findByIdAndDelete(id)
  }
)

//inngest function to update user data from database
const syncUserUpdation= inngest.createFunction(
  {id:'update-user-from-clerk'},
  {event:'clerk/user.updated'},
  async ({event})=>{
    const {id, first_name, last_name, email_addresses, image_url}= event.data
      const userData= {
        _id:id,
        name:first_name+' '+last_name,
        email:email_addresses[0].email_address,
        image: image_url
      }

      await User.findByIdAndUpdate(id, userData)
  }
)

//Inngest fn to cancel booking and relaease seats of show after 10 minutes of booking created if payment s not made yet

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  {id:'release-seats-delete-booking'},
  {event: 'app/checkpayment'},
  async ({event, step})=>{
    const tenMinutesLater= new Date(Date.now() + 10*60*1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run('check-payment-status', async ()=>{
      const bookingId= event.data.bookingId;
      const booking= await Booking.findById(bookingId)

      //if payment is not made yet
      if(!booking.isPaid){
        const show= await Show.findById(booking.show);

        booking.bookedSeats.forEach((seat)=>{
          delete show.occupiedSeats[seat]
        });
        show.markModified('occupiedSeats');
         await show.save();
         await Booking.findByIdAndDelete(booking._id)
      }
    })
  }
)

//innngest fn to send email when user books a Show
const sendBookingConfirmationEmail = inngest.createFunction(
  {id:"send-booking-confirmation-email"},
  {event: "app/show.booked"},
  async ({event, step})=>{
    const {bookingId}= event.data;

    const booking = await Booking.findById(bookingId).populate({
      path:"show",
      populate:{
        path:"movie", model:"Movie"
      }
    }).populate("user")

    await sendEmail({
      to:booking.user.email,
      subject:`Payment Confirmation: "${booking.show.movie.title}" booked!`,
      body:`<h3>
        your booking has been confirmed right now for the above movie
      </h3>`
    })
  }
)

//Inngest function to send reminders for booked movie before movie get started
const sendShowReminders = inngest.createFunction(
  {id: 'send-show-reminders'},
  {cron:"0 */8 * * * "},//exceute after every 8 hrs
  async ({step}) =>{
    const now= new Date();
    const in8Hours= new Date(now.getTime()+ 8*60*60*1000)
    const windowStart= new Date(in8Hours.getTime() - 10*60*1000);

    //create reminder tasks
    const reminderTasks = await step.run("prepare-reminder-tasks", async ()=>{
      const shows= await Show.find({
        showTime: {$gte: windowStart, $lte: in8Hours},
      }).populate('movie');

      const tasks=[];
      for(const show of shows){
        //below line is to ignore not booked shows
        if(!show.movie || !show.occupiedSeats) continue;

        const userIds= [... new Set(Object.values(show.occupiedSeats))]

        if(userIds.length === 0) continue;

        const users = await User.find({_id: {$in: userIds}}).select("name email")

        for(const user of users){
          tasks.push({
            userEmail:user.email,
            userName:user.name,
            movieTitle:show.movie.title,
            showTime:show.showTime,
          })
        }
      }

      return tasks; //reminderTasks me tasks array chala gya
    })

if(reminderTasks.length === 0) {
  return {sent: 0, message: "No reminders to send"}
}
//send reminder emails
  const results = await step.run('send-all-reminders',async ()=>{
    return await Promise.allSettled(
      reminderTasks.map(task => sendEmail({
      to:task.userEmail,
      subject:`Reminder: Your movie "${task.movieTitle}" starts soon!`,
      body:`<div>
        <h2> Hello ${task.userName} </h2>
        <p> your ${task.movieTitle} movie is going to start soon- make sure you are ready </p2>
      </div>`

    }))
    )
  })
  const sent = results.filter(result => result.status === "fulfilled").length;
  const failed= results.length - sent;

return {
  sent,
  failed,
  message: `Sent ${sent} reminder(s), ${failed} failed`
}
  }
)




//innegst fn to send new show notification
const sendNewShowNotifications= inngest.createFunction(
  {id:"send-new-show-notification"},
  {event:'app/show.added'},
  async ({event})=>{
    const {movieTitle}=event.data;
    const users= await User.find({})

    for(const user of users){
      const userEmail= user.email;

      const subject= `New Show Added: ${movieTitle}`;
      const body = `<div> we have just added a new show to our library . Visit our website to experience it. Thanks, QuickShow Team</div>`;

      await sendEmail({
        to:userEmail,
        subject,
        body
      })

    }
    return {message: "Notification Sent"}
  }
)


// Create an array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications,

];
