// import { Audio } from "expo-av";
import {
  CameraCapturedPicture,
  CameraMode,
  CameraType,
  CameraView,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import { Camera, Flashlight, FlashlightOff, RefreshCw, X } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, useColorScheme, View } from "react-native";

interface ComponentProps {
  onChange: (image: CameraCapturedPicture) => void;
}

const CameraInput: React.FC<ComponentProps> = ({ onChange }) => {
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const cameraRef = useRef<CameraView>(null);
  const [visible, setVisible] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [permission, requestPermission] = useCameraPermissions();

  async function handleOpenCamera() {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) return;
    }
    setVisible(true);
  }

  async function handleTakePicture() {
    try {
      const photo = await cameraRef.current?.takePictureAsync();
      if (photo?.uri) {
        onChange(photo);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setVisible(false);
    }
  }

  async function handleRecordVideo() {
    console.log("Start recording...");
    if (recording) {
      setRecording(false);
      cameraRef.current?.stopRecording();
      return;
    }
    setRecording(true);
    try {
      const video = await cameraRef.current?.recordAsync();
      console.log("Recording...");
      console.log({ video });
    } catch (error) {
      console.log("Error on recording...");
      console.log(error);
    }
  }

  return (
    <React.Fragment>
      <Pressable
        onPress={handleOpenCamera}
        className="rounded-full border border-gray-200 bg-gray-200 p-2 dark:border-gray-800 dark:bg-gray-800"
      >
        <Camera size={16} color={isDark ? "#d1d5db" : "#4a5565"} />
      </Pressable>

      <Modal visible={visible} animationType="slide">
        <View className="flex-1 bg-black/20">
          <CameraView
            ref={cameraRef}
            mute={false}
            style={{ flex: 1 }}
            facing={facing}
            responsiveOrientationWhenOrientationLocked
          />

          <View className="absolute top-0 w-full gap-4 px-6 pt-16">
            <View className="flex flex-row items-center justify-between">
              <View className="flex-none">
                <Pressable
                  onPress={() => setVisible(false)}
                  className="flex flex-row items-center justify-center rounded-full bg-black/40 p-2"
                >
                  <X size={24} color={"#fff"} />
                </Pressable>
              </View>

              <View className="flex flex-1 flex-row items-center justify-center">
                <View className="flex-none rounded-lg bg-black/40 px-2.5 py-1">
                  <Text className="text-sm font-medium text-white">00:00</Text>
                </View>
              </View>

              <View className="flex-none">
                <Pressable
                  onPress={() => setFlash((state) => (state === "on" ? "off" : "on"))}
                  className={`flex flex-row items-center justify-center rounded-full p-2 ${flash === "off" ? "bg-white" : "bg-black/40"}`}
                >
                  {flash === "off" ? (
                    <Flashlight size={24} color={"#000000"} />
                  ) : (
                    <FlashlightOff size={24} color={"#ffffff"} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          <View className="absolute bottom-0 w-full gap-4 p-6">
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => setVisible(false)}>
                <Text className="text-lg text-white">{t("cancel")}</Text>
              </Pressable>

              {mode === "video" ? (
                <Pressable
                  onPress={handleRecordVideo}
                  className="rounded-full border-4 border-white p-1"
                >
                  <View className={`h-16 w-16 overflow-hidden rounded-full bg-red-500`} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleTakePicture}
                  className="rounded-full border-4 border-white p-1"
                >
                  <View className={`h-16 w-16 overflow-hidden rounded-full bg-white`} />
                </Pressable>
              )}

              <View>
                <Pressable
                  onPress={() => setFacing((state) => (state === "back" ? "front" : "back"))}
                  className={`rounded-full p-3 ${facing === "back" ? "bg-black/20" : "bg-white"}`}
                >
                  <RefreshCw size={24} color={facing === "back" ? "#fff" : "#000"} />
                </Pressable>
              </View>
            </View>

            <View className="flex flex-row items-center justify-center gap-4 p-3">
              <Pressable onPress={() => setMode("video")} className="flex-none px-2 py-1">
                <Text
                  className={`text-base font-medium uppercase ${mode === "video" ? "text-yellow-400" : "text-white"}`}
                >
                  {t("video")}
                </Text>
              </Pressable>

              <Pressable onPress={() => setMode("picture")} className="flex-none px-2 py-1">
                <Text
                  className={`text-base font-medium uppercase ${mode === "picture" ? "text-yellow-400" : "text-white"}`}
                >
                  {t("photo")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </React.Fragment>
  );
};

export default CameraInput;
