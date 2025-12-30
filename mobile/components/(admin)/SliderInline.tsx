// app/(admin)/components/SliderInline.tsx
import React, { useState } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import Carousel from 'react-native-reanimated-carousel';

const { width } = Dimensions.get("window");

const sliderStyles = StyleSheet.create({
  carouselContainer: { alignItems: 'center', marginBottom: 15 },
  slide: { borderRadius: 12, overflow: 'hidden', alignItems: 'center' },
  slideImage: { width: width * 0.9, height: 180, borderRadius: 12 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
});

type Props = {
  slides: { id: number; image: any }[];
};

export default function SliderInline({ slides }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <View style={sliderStyles.carouselContainer}>
      <Carousel
        loop
        width={width}
        height={180}
        autoPlay
        autoPlayInterval={3000}
        data={slides}
        scrollAnimationDuration={1000}
        onSnapToItem={(index) => setCurrentIndex(index)}
        renderItem={({ item }) => (
          <View style={sliderStyles.slide}>
            <Image source={item.image} style={sliderStyles.slideImage} resizeMode="cover" />
          </View>
        )}
      />
      <View style={sliderStyles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[sliderStyles.dot, { opacity: currentIndex === index ? 1 : 0.3 }]}
          />
        ))}
      </View>
    </View>
  );
}