import axios from "axios"
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

//fn to fetch all now playing movies from TMDB using api 
export const NowPlayingMovies= async (req , res)=>{
  try{
    const {data} = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
      headers:{
        Authorization:`Bearer ${process.env.TMDB_API_KEY}`
      }
    })

    const movies= data.results;
    //send response
    res.json({
      success:true,
      movies:movies
    });

  } catch (err) {
    console.log("Error occured while fetching movies from TMDB")
    res.json({
      success:false,
      message:err.message
    })
  }
}

// fn to add a new show to database 
export const addShow = async (req, res) =>{
   try{
    const { movieId, showsInput, showPrice} = req.body;
    let movie= await Movie.findById(movieId);

    if(!movie) {
      //fetch movie details and credits from TMDB api 
     const [movieDetailsResponse, movieCreditsResponse]= await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {headers:{
        Authorization:`Bearer ${process.env.TMDB_API_KEY}`}}),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {headers:{
        Authorization:`Bearer ${process.env.TMDB_API_KEY}`}})
      ])

      const movieApiData=movieDetailsResponse.data;
      const movieCreditData= movieCreditsResponse.data;
      console.log(movieCreditData.cast) 
      //create movie object
      const movieDetails= {
        _id:movieId,
        title:movieApiData.title,
        overview:movieApiData.overview,
        poster_path:movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres:movieApiData.genres,
        casts:movieCreditData.cast,
        release_date:movieApiData.release_date,
        original_language:movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      }
      //add movie to db
      movie= await Movie.create(movieDetails);
    }

    //create show
    const showsToCreate=[];
    showsInput.forEach(show => {
      const showDate= show.date;
      show.time.forEach((time)=>{
        const dateTimeString= `${showDate}T${time}`;
        showsToCreate.push({
          movie:movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats:{}
        })
      })
    });

    if(showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({
      success:true,
      message: 'show added successfully'
    })

   }catch(err) {
    console.log("Error occured while add show to database")
    res.json({
      success:false,
      message:err.message
    })
   }
}

// function to get All shows from the database
export const getShows= async(req, res) =>{
  try{
    const shows= await Show.find({showDateTime: {$gte:new Date()}}).populate('movie').sort({showDateTime: 1});

    //filter unique show (unique movie)
    const uniqueShows= new Set(shows.map((show )=> show.movie));

    res.json({
      success:true,
      shows:Array.from(uniqueShows)
    });


  } catch(err){
    console.log("Error while fetching all shows");
    res.json({
      success:false,
      message:err.message
    })
  }
}

//function to get a show from database
export const getShow = async(req, res) =>{
  try{
    const {movieId}=req.params;
    //get all upcoming shows for the movie
    const shows= await Show.find({movie:movieId, showDateTime:{$gte: new Date()}});

    //get movie details 
    const movie= await Movie.findById(movieId);
    
    //group shows by date
    const dateTime={}
    shows.forEach((show)=>{
      const date= show.showDateTime.toISOString().split("T")[0];
      if(!dateTime[date]){
        dateTime[date]=[]
      }
      dateTime[date].push({time: show.showDateTime, showId:show._id})
    })

    //send response
    res.json({
      success:true,
      movie,
      dateTime
    })

  }catch(err){
    res.json({
      success:false,
      message:err.message
    })
  }
}