import { CameraView, type CameraCapturedPicture, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Camera } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

const TANZANIA_ID_CARD_WIDTH = 708;
const TANZANIA_ID_CARD_HEIGHT = 450;

export const IDENTITY_SCAN_ASPECT_RATIO = TANZANIA_ID_CARD_WIDTH / TANZANIA_ID_CARD_HEIGHT;
export const BIRTH_CERTIFICATE_SCAN_ASPECT_RATIO = 595 / 842;

interface ComponentProps {
  value?: string | null;
  onChange: (uri: string) => void;
  aspectRatio?: number;
  accessibilityLabel?: string;
  permissionMessage?: string;
  scanErrorMessage?: string;
}

function getCenteredCropRect(photo: CameraCapturedPicture, aspectRatio: number) {
  const { width, height } = photo;
  const sourceAspectRatio = width / height;

  if (sourceAspectRatio > aspectRatio) {
    const cropWidth = Math.min(width, Math.max(1, Math.round(height * aspectRatio)));

    return {
      originX: Math.max(0, Math.floor((width - cropWidth) / 2)),
      originY: 0,
      width: cropWidth,
      height,
    };
  }

  const cropHeight = Math.min(height, Math.max(1, Math.round(width / aspectRatio)));

  return {
    originX: 0,
    originY: Math.max(0, Math.floor((height - cropHeight) / 2)),
    width,
    height: cropHeight,
  };
}

async function cropDocumentScan(photo: CameraCapturedPicture, aspectRatio: number) {
  const context = ImageManipulator.manipulate(photo.uri);
  context.crop(getCenteredCropRect(photo, aspectRatio));

  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });

  return result.uri;
}

const CameraPhotoInput: React.FC<ComponentProps> = ({
  onChange,
  aspectRatio = IDENTITY_SCAN_ASPECT_RATIO,
  accessibilityLabel,
  permissionMessage,
  scanErrorMessage,
}) => {
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const [visible, setVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function handleOpenCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(t("camera_unavailable"), permissionMessage ?? t("camera_permission_identity"));
        return;
      }
    }
    setVisible(true);
  }

  async function handleTakePicture() {
    if (isCapturing) return;

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
      });

      if (!photo?.uri) return;

      const uri = await cropDocumentScan(photo, aspectRatio);
      onChange(uri);
      setVisible(false);
    } catch {
      Alert.alert(t("scan_failed"), scanErrorMessage ?? t("identity_scan_capture_failed"));
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <React.Fragment>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? t("scan_identity")}
        onPress={handleOpenCamera}
        className="rounded-full border border-gray-200 bg-gray-200 p-2"
      >
        <Camera size={16} color={"#4a5565"} />
      </Pressable>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View className="flex-1 justify-center bg-black px-4">
          <View className="w-full overflow-hidden rounded-2xl bg-gray-950" style={{ aspectRatio }}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          </View>

          {/* Controls */}
          <View className="absolute bottom-0 w-full flex-row items-center justify-between p-6">
            <Pressable onPress={() => setVisible(false)}>
              <Text className="text-lg text-white">{t("cancel")}</Text>
            </Pressable>

            <Pressable
              onPress={handleTakePicture}
              disabled={isCapturing}
              className={`h-20 w-20 rounded-full border-4 border-white ${
                isCapturing ? "opacity-50" : ""
              }`}
            />

            <View style={{ width: 60 }} />
          </View>
        </View>
      </Modal>
    </React.Fragment>
  );
};

export default CameraPhotoInput;
