const timeFormat= (minutes)=>{
  const hours= Math.floor(minutes/60);
  const minutesRemaining= minutes % 60;
  return `${hours}hr ${minutesRemaining}min`
}

export default timeFormat;