// app/(admin)/components/DashboardTab.tsx
import DashboardCharts from "@/components/DashBoardCharts";
import StatsRow from "@/components/StatsRow";
import React from "react";
import { ScrollView } from "react-native";
import SliderInline from "./SliderInline";

const slides = [
  { id: 1, image: require('../../assets/images/quangcao4.png') },
  { id: 2, image: require('../../assets/images/quangcao5.png') },
  { id: 3, image: require('../../assets/images/quangcao3.png') },
];

type Props = {
  stats: any;
};

export default function DashboardTab({ stats }: Props) {
  if (!stats) return null;

  return (
    <ScrollView>
      <SliderInline slides={slides} />
      <StatsRow stats={stats} />
      <DashboardCharts stats={stats} />
    </ScrollView>
  );
}