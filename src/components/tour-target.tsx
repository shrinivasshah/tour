import React, { useEffect, useRef } from "react";
import { useTour } from "../hooks/use-tour";

export const TourTarget = ({ id, children }) => {
    const { registerTarget } = useTour();
    const targetRef = useRef(null);
    
    useEffect(() => {
      if (targetRef.current) {
        registerTarget(id, targetRef.current);
      }
    }, [id, registerTarget]);
    
    return React.cloneElement(React.Children.only(children), {
      id,
      ref: targetRef,
    });
  };
  