import { useState, useEffect } from 'react';
import { Image as KonvaImage } from 'react-konva';

export function GifSticker({ layer, onDragEnd }) {
  const [gifCanvas, setGifCanvas] = useState(null);

  useEffect(() => {
  import('gifler').then(module => {
    const canvas = document.createElement('canvas');
    module.gifler(layer.url).getCanvas(canvas).play();
    setGifCanvas(canvas);
  });
}, [layer.url]);


  if (!gifCanvas) return null;

  return (
    <KonvaImage
      image={gifCanvas}
      x={layer.x}
      y={layer.y}
      width={80}
      height={80}
      draggable
      onDragEnd={onDragEnd}
    />
  );
}
