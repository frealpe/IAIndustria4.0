import React from 'react';
import './TypingLoader.css';


export const TypingLoader = ({ className }) => {
  return (
    <div className={`typing ${ className }`}>
      <span className="circle scaling"></span>
      <span className="circle scaling"></span>
      <span className="circle scaling"></span>
    </div>
  )
}
export default React.memo(TypingLoader);