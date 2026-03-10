import React from 'react';

const resizableTitleStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingRight: '8px',
  },
  text: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resizeHandle: {
    width: '10px',
    height: '100%',
    cursor: 'col-resize',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s',
  },
};

const ResizableTitle = (props) => {
  const { children, onResize, width, ...restProps } = props;

  const handleMouseDown = (e) => {
    if (!onResize) return;

    e.preventDefault();
    e.stopPropagation();

    const th = e.currentTarget.closest('th');
    if (!th) return;

    const startWidth = th.offsetWidth;
    const startX = e.clientX;

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <th {...restProps} style={{ position: 'relative' }}>
      <div style={resizableTitleStyles.container}>
        <span style={resizableTitleStyles.text}>{children}</span>
        {onResize && (
          <div onMouseDown={handleMouseDown} style={resizableTitleStyles.resizeHandle} />
        )}
      </div>
    </th>
  );
};

export default React.memo(ResizableTitle);
