import BeneficiaryField from "../components/form/beneficiary-field";
import BulkGrievanceField from "../components/form/bulk-grievance-field";
import CameraPhotoField from "../components/form/camera-photo-field";
import CameraVideoField from "../components/form/camera-video-field";
import ComplainantField from "../components/form/complainant-field";
import DateField from "../components/form/date-field";
import DistrictField from "../components/form/district-field";
import GrievanceCategoryField from "../components/form/grievance-category-field";
import GrievanceTypeField from "../components/form/grievance-type-field";
import PasswordField from "../components/form/password-field";
import PaymentWindowPeriodField from "../components/form/payment-window-period-field";
import PaymentWindowYearField from "../components/form/payment-window-year-field";
import PhotoPicker from "../components/form/photo-picker";
import RadioGroupField from "../components/form/radio-group-field";
import RegionField from "../components/form/region-field";
import SelectField from "../components/form/select-field";
import AnonymouslyField from "../components/form/submit-anonymously";
import SubscribeButton from "../components/form/subscribe-button";
import SwitchField from "../components/form/switch-field";
import TextField from "../components/form/text-field";
import TextareaField from "../components/form/textarea-field";
import UsernameField from "../components/form/username-field";
import VideoPicker from "../components/form/video-picker";
import VillageField from "../components/form/village-field";
import WardField from "../components/form/ward-field";

export const fieldComponents = {
  TextField,
  DateField,
  SelectField,
  TextareaField,
  PhotoPicker,
  VideoPicker,
  SwitchField,
  UsernameField,
  PasswordField,
  RegionField,
  DistrictField,
  WardField,
  BeneficiaryField,
  BulkGrievanceField,

  VillageField,
  GrievanceCategoryField,
  GrievanceTypeField,
  ComplainantField,
  RadioGroupField,
  CameraPhotoField,
  CameraVideoField,
  AnonymouslyField,
  PaymentWindowYearField,
  PaymentWindowPeriodField,
};

export const formComponents = {
  SubscribeButton,
};
