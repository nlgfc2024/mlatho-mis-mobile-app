import { CameraCapturedPicture } from "expo-camera";

import { useFieldContext } from "@/src/providers/form-context";

import CameraInput from "./camera-input";

const CameraPhotoField = () => {
  const field = useFieldContext<CameraCapturedPicture[]>();

  return (
    <CameraInput
      onChange={(image) => {
        field.handleChange((state = []) => [...state, image]);
      }}
    />
  );
};

export default CameraPhotoField;
