import { useCallback, useRef, useState } from 'react';

export const useLongPress = (onLongPress, onClick, { shouldPreventDefault = true, delay = 500 } = {}) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef();
  const target = useRef();

  const start = useCallback(
    event => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, { passive: false });
        target.current = event.target;
      }
      setLongPressTriggered(false);
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      shouldTriggerClick && !longPressTriggered && onClick && onClick(event);
      setLongPressTriggered(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: e => start(e),
    onTouchStart: e => start(e),
    onMouseUp: e => clear(e),
    onMouseLeave: e => clear(e, false),
    onTouchEnd: e => clear(e),
    onTouchMove: e => clear(e, false)
  };
};

const isTouchEvent = event => {
  return 'touches' in event;
};

const preventDefault = event => {
  if (!isTouchEvent(event)) return;
  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};
