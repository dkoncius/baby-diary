import { useState } from 'react';
import ProgressFiltering from '../../components/KidsProgressPage/ProgressFiltering';
import { RxCross1 } from "react-icons/rx";
import { useNavigate } from 'react-router-dom';

const facesData = [
  {src: "/faces/angry.svg", mood: "angry"},
  {src: "/faces/cry.svg", mood: "cry"},
  {src: "/faces/laugh.svg", mood: "laugh"},
  {src: "/faces/love.svg", mood: "love"},
  {src: "/faces/peace.svg", mood: "peace"},
  {src: "/faces/wow.svg", mood: "wow"}
];


const KidsProgressPage = () => {
    const [isFiltering, setIsFiltering] = useState(false)
    const navigate = useNavigate()

    // Assuming you will fetch moodEntries from a database in the future
    const moodEntries = new Array(31).fill(0).map((_, i) => {
      // Simulating that some days have no mood chosen
      if (i % 5 === 0) {
        return { day: i + 1, mood: "none", src: "" }; // No mood chosen for this day
      }
      const face = facesData[i % facesData.length];
      return {
        day: i + 1,
        mood: face.mood,
        src: face.src
      };
    });

    const goBackToFeed = () => {
      return navigate('/content/gallery');
  }

  return (
    <div className="container">
      <div className="kids-progress">
          <div className="icon" onClick={goBackToFeed}>
            <RxCross1/>
          </div>
          <h2>Pokyčiai</h2>
          <ProgressFiltering setIsFiltering={setIsFiltering}/>
          
          <div className="progress">
            <p className='title'>Ūgis</p>
            <div className="stats">
                <img src="/content/line-1.svg" alt="" />
                <p className='units'>45 → 54</p>
            </div>
          </div>

          <div className="progress">
            <p className='title'>Svoris</p>
            <div className="stats">
                <img src="/content/line-2.svg" alt="" />
                <p className='units'>2.5 → 3.0</p>
            </div>
          </div>

          <div className="progress">
            <p className='title'>Nuotaika</p>
            <div className="stats moods">
              {moodEntries.map((entry, index) => (
                  <div key={index} className="mood">
                      {entry.src ? (
                          // Render the image if src is not empty
                          <img src={entry.src} alt={entry.mood} className="face" />
                      ) : (
                          // Render a placeholder div for days without a chosen mood
                          <div className="no-face"></div>
                      )}
                      <p className="day">{entry.day}</p>
                  </div>
              ))}
            </div>
          </div>
      </div>
    </div>
  )
}

export default KidsProgressPage