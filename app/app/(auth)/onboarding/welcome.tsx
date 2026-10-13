import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Text as SvgText,
  Defs,
  RadialGradient,
  Stop,
  Line,
} from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function HeroIllustration() {
  const S = 280;
  const cx = S / 2;

  return (
    <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#C8F23D" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#C8F23D" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Lime glow circle */}
      <Circle cx={cx} cy={cx} r={120} fill="url(#glow)" />

      {/* Dark ellipse base / shadow */}
      <Ellipse cx={cx} cy={230} rx={80} ry={14} fill="#0a1205" opacity={0.7} />

      {/* Lime ellipse scale platform */}
      <Ellipse cx={cx} cy={210} rx={68} ry={10} fill="#C8F23D" />

      {/* Scale body */}
      <Rect
        x={cx - 64}
        y={170}
        width={128}
        height={42}
        rx={10}
        fill="#19260A"
        stroke="#C8F23D"
        strokeWidth={1.5}
      />

      {/* Food bowl */}
      <Ellipse cx={cx} cy={162} rx={36} ry={10} fill="#2d3d1a" />
      <Path
        d={`M ${cx - 36} 162 Q ${cx - 36} 185 ${cx} 188 Q ${cx + 36} 185 ${cx + 36} 162 Z`}
        fill="#2d3d1a"
      />
      {/* Bowl rim */}
      <Ellipse cx={cx} cy={162} rx={36} ry={10} fill="#3a4e20" />

      {/* Food dots: protein, carbs, fat */}
      {/* Protein (orange-red) */}
      <Circle cx={cx - 12} cy={168} r={6} fill="#E1654A" />
      {/* Carbs (amber) */}
      <Circle cx={cx + 8} cy={165} r={5} fill="#E8B339" />
      {/* Fat (teal) */}
      <Circle cx={cx} cy={174} r={5} fill="#4F8F8A" />

      {/* Vertical arm / pole */}
      <Rect
        x={cx - 4}
        y={72}
        width={8}
        height={100}
        rx={4}
        fill="#19260A"
        stroke="#C8F23D"
        strokeWidth={1.5}
      />

      {/* Camera box */}
      <Rect
        x={cx - 32}
        y={44}
        width={64}
        height={44}
        rx={8}
        fill="#19260A"
        stroke="#C8F23D"
        strokeWidth={1.5}
      />
      {/* Camera lens outer */}
      <Circle cx={cx} cy={66} r={14} fill="#0d1a05" stroke="#C8F23D" strokeWidth={1.5} />
      {/* Camera lens inner (lime fill) */}
      <Circle cx={cx} cy={66} r={8} fill="#C8F23D" />
      {/* Lens pupil */}
      <Circle cx={cx} cy={66} r={3.5} fill="#19260A" />

      {/* Dashed scan beams from camera to food */}
      <Line
        x1={cx - 22}
        y1={88}
        x2={cx - 30}
        y2={155}
        stroke="#C8F23D"
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.6}
      />
      <Line
        x1={cx + 22}
        y1={88}
        x2={cx + 30}
        y2={155}
        stroke="#C8F23D"
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.6}
      />

      {/* Weight display chip "247g" */}
      <Rect
        x={cx + 42}
        y={180}
        width={52}
        height={22}
        rx={11}
        fill="#C8F23D"
      />
      <SvgText
        x={cx + 68}
        y={195}
        textAnchor="middle"
        fontSize={11}
        fontWeight="700"
        fill="#19260A"
        fontFamily="monospace"
      >
        247g
      </SvgText>
    </Svg>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-olive">
      {/* Centered content */}
      <View className="flex-1 items-center justify-center px-7">
        {/* SVG Hero */}
        <HeroIllustration />

        {/* ScalyCam label */}
        <Text
          className="text-lime text-xs font-semibold uppercase tracking-widest mt-8 mb-4"
          style={{ letterSpacing: 4 }}
        >
          ScalyCam
        </Text>

        {/* H1 */}
        <Text
          className="text-white font-semibold text-center mb-4"
          style={{ fontSize: 38, letterSpacing: -0.025 * 38, lineHeight: 44 }}
        >
          {"Weigh it.\nWe'll log it."}
        </Text>

        {/* Subtitle */}
        <Text
          className="text-white/60 text-center"
          style={{ fontSize: 16, lineHeight: 24 }}
        >
          {"Place food on the scale.\nThe camera handles the rest."}
        </Text>
      </View>

      {/* Bottom actions */}
      <View className="px-7 pb-12">
        <TouchableOpacity
          className="bg-lime rounded-full py-4 items-center mb-4"
          onPress={() => router.push("/(auth)/onboarding/basics" as any)}
          activeOpacity={0.85}
        >
          <Text className="text-olive font-semibold text-base">Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login" as any)}
          activeOpacity={0.7}
        >
          <Text
            className="text-white/60 text-center"
            style={{ fontSize: 14 }}
          >
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
