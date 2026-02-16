import mongoose from "mongoose";

const showSchema= new mongoose.Schema(
  {
    movie:{type:String, required:true, ref:'Movie'},
    showPrice:{type:Number, required:true},
    showDateTime:{ type:Date, required:true},
    occupiedSeats:{ type:Object, default:{}},
  } ,{minimize: false}
)

const Show= mongoose.model("Show",showSchema)
export default Show;