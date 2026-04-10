import { Font } from '@react-pdf/renderer';

export const registerFonts = () => {
  Font.register({
    family: 'Noto Sans',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSans/NotoSans-Regular.ttf', fontWeight: 400 },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSans/NotoSans-Italic.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSans/NotoSans-Medium.ttf', fontWeight: 500 },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSans/NotoSans-SemiBold.ttf', fontWeight: 600 },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSans/NotoSans-Bold.ttf', fontWeight: 700 },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSans/NotoSans-BoldItalic.ttf', fontWeight: 700, fontStyle: 'italic' },
    ]
  });

  Font.register({
    family: 'Noto Serif',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSerif/NotoSerif-Regular.ttf', fontWeight: 400 },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSerif/NotoSerif-Italic.ttf', fontWeight: 400, fontStyle: 'italic' },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSerif/NotoSerif-Bold.ttf', fontWeight: 700 },
      { src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/unhinted/ttf/NotoSerif/NotoSerif-BoldItalic.ttf', fontWeight: 700, fontStyle: 'italic' },
    ]
  });
};
