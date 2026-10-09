import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useTransitionNavigate } from "../../src/components/navigation/Transitionprovider";
import { OnboardingScreen } from "../../src/components/onboarding/OnboardingScreen";
import { Button } from "../../src/components/ui/Button";
import { FieldGroup } from "../../src/components/ui/FieldGroup";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { TextField } from "../../src/components/ui/TextField";
import { spacing } from "../../src/theme/spacing";

type BiologicalSex = "female" | "male";
type UnitSystem = "metric" | "imperial";

interface FormErrors {
  biologicalSex?: string;
  dateOfBirth?: string;
  height?: string;
  weight?: string;
}

interface ProfileValues {
  biologicalSex: BiologicalSex | null;
  day: string;
  month: string;
  year: string;
  height: string;
  weight: string;
  unitSystem: UnitSystem;
}

const CURRENT_STEP = 1;
const MIN_AGE = 13;
const MAX_AGE = 120;

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.20462;

// Plausible human ranges. They catch typos ("1" or "1750") and unit mix-ups
// without rejecting real people.
const LIMITS = {
  metric: {
    height: { min: 50, max: 260, unit: "cm" },
    weight: { min: 20, max: 350, unit: "kg" },
  },
  imperial: {
    height: { min: 20, max: 102, unit: "in" },
    weight: { min: 45, max: 770, unit: "lb" },
  },
} as const;

const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
] as const;

const UNIT_OPTIONS = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
] as const;

const PLACEHOLDERS = {
  metric: { height: "175", weight: "70" },
  imperial: { height: "69", weight: "154" },
} as const;

function digitsOnly(text: string, maxLength: number): string {
  return text.replace(/\D/g, "").slice(0, maxLength);
}

// Accepts "," as a decimal separator (some keyboards show it) and keeps
// only the first decimal point.
function sanitizeDecimal(text: string): string {
  const cleaned = text.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
}

function calculateAge(birthDate: Date, today: Date): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

function convertMeasurement(
  value: string,
  factor: number,
  decimals: number,
): string {
  const parsed = Number(value);
  if (!value.trim() || !Number.isFinite(parsed)) {
    return value;
  }
  return String(Number((parsed * factor).toFixed(decimals)));
}

function validateMeasurement(
  raw: string,
  noun: "height" | "weight",
  limits: { min: number; max: number; unit: string },
): string | undefined {
  if (!raw.trim()) {
    return `Enter your ${noun}.`;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return `Enter a valid ${noun}.`;
  }

  if (value < limits.min || value > limits.max) {
    return `Enter a ${noun} between ${limits.min} and ${limits.max} ${limits.unit}.`;
  }

  return undefined;
}

function validate(values: ProfileValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.biologicalSex) {
    errors.biologicalSex = "Select an option.";
  }

  const dayNumber = Number(values.day);
  const monthNumber = Number(values.month);
  const yearNumber = Number(values.year);
  const hasAllDateParts =
    values.day.length > 0 && values.month.length > 0 && values.year.length === 4;

  if (!hasAllDateParts) {
    errors.dateOfBirth = "Enter your full date of birth.";
  } else {
    const candidate = new Date(yearNumber, monthNumber - 1, dayNumber);
    const isRealDate =
      candidate.getFullYear() === yearNumber &&
      candidate.getMonth() === monthNumber - 1 &&
      candidate.getDate() === dayNumber;

    if (!isRealDate) {
      errors.dateOfBirth = "Enter a valid date.";
    } else {
      const today = new Date();
      if (candidate > today) {
        errors.dateOfBirth = "Date of birth can't be in the future.";
      } else {
        const age = calculateAge(candidate, today);
        if (age < MIN_AGE || age > MAX_AGE) {
          errors.dateOfBirth = `Age must be between ${MIN_AGE} and ${MAX_AGE}.`;
        }
      }
    }
  }

  const limits = LIMITS[values.unitSystem];
  errors.height = validateMeasurement(values.height, "height", limits.height);
  errors.weight = validateMeasurement(values.weight, "weight", limits.weight);

  return errors;
}

export default function ProfilesScreen() {
  const router = useRouter();

  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const dayInputRef = useRef<TextInput>(null);
  const monthInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);
  const heightInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);

  // Errors are derived from the current values, so they update as the user
  // corrects them and can never go stale.
  const errors = useMemo(
    () =>
      validate({ biologicalSex, day, month, year, height, weight, unitSystem }),
    [biologicalSex, day, month, year, height, weight, unitSystem],
  );

  const showError = <K extends keyof FormErrors>(field: K) =>
    hasSubmitted ? errors[field] : undefined;

  const limits = LIMITS[unitSystem];

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Switching units converts what's already typed. Otherwise "175" (cm)
  // would silently become "175 in".
  const handleUnitChange = useCallback(
    (next: UnitSystem) => {
      if (next === unitSystem) {
        return;
      }

      if (next === "imperial") {
        setHeight((prev) => convertMeasurement(prev, 1 / CM_PER_INCH, 1));
        setWeight((prev) => convertMeasurement(prev, LB_PER_KG, 1));
      } else {
        setHeight((prev) => convertMeasurement(prev, CM_PER_INCH, 0));
        setWeight((prev) => convertMeasurement(prev, 1 / LB_PER_KG, 1));
      }

      setUnitSystem(next);
    },
    [unitSystem],
  );

  // Number pads on iOS have no "next" key, so move focus automatically once
  // a date part is complete.
  const handleDayChange = useCallback(
    (text: string) => {
      const next = digitsOnly(text, 2);
      setDay(next);
      if (next.length === 2 && day.length < 2) {
        monthInputRef.current?.focus();
      }
    },
    [day],
  );

  const handleMonthChange = useCallback(
    (text: string) => {
      const next = digitsOnly(text, 2);
      setMonth(next);
      if (next.length === 2 && month.length < 2) {
        yearInputRef.current?.focus();
      }
    },
    [month],
  );

  const handleYearChange = useCallback(
    (text: string) => {
      const next = digitsOnly(text, 4);
      setYear(next);
      if (next.length === 4 && year.length < 4) {
        heightInputRef.current?.focus();
      }
    },
    [year],
  );

  const handleContinue = useCallback(() => {
    setHasSubmitted(true);

    // Send focus to the first field that needs attention.
    if (errors.biologicalSex) {
      return;
    }
    if (errors.dateOfBirth) {
      dayInputRef.current?.focus();
      return;
    }
    if (errors.height) {
      heightInputRef.current?.focus();
      return;
    }
    if (errors.weight) {
      weightInputRef.current?.focus();
      return;
    }
    const go = useTransitionNavigate();
    // Note: profile values are not persisted anywhere yet.
    go("/goals");
  }, [errors, router]);

  const dateInvalid = Boolean(showError("dateOfBirth"));

  return (
    <OnboardingScreen
      step={CURRENT_STEP}
      title="Tell us about yourself"
      subtitle="This helps calibrate your metrics accurately."
      onBack={handleBack}
      footer={<Button label="Continue" onPress={handleContinue} />}
    >
      <View style={styles.form}>
        <FieldGroup label="Biological sex" error={showError("biologicalSex")}>
          <SegmentedControl
            options={SEX_OPTIONS}
            value={biologicalSex}
            onChange={setBiologicalSex}
            accessibilityLabel="Biological sex"
          />
        </FieldGroup>

        <FieldGroup label="Date of birth" error={showError("dateOfBirth")}>
          <View style={styles.dateRow}>
            <View style={styles.dateShort}>
              <TextField
                label="Day of birth"
                inputRef={dayInputRef}
                value={day}
                onChangeText={handleDayChange}
                invalid={dateInvalid}
                placeholder="DD"
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
                returnKeyType="next"
                onSubmitEditing={() => monthInputRef.current?.focus()}
              />
            </View>
            <View style={styles.dateShort}>
              <TextField
                label="Month of birth"
                inputRef={monthInputRef}
                value={month}
                onChangeText={handleMonthChange}
                invalid={dateInvalid}
                placeholder="MM"
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
                returnKeyType="next"
                onSubmitEditing={() => yearInputRef.current?.focus()}
              />
            </View>
            <View style={styles.dateLong}>
              <TextField
                label="Year of birth"
                inputRef={yearInputRef}
                value={year}
                onChangeText={handleYearChange}
                invalid={dateInvalid}
                placeholder="YYYY"
                keyboardType="number-pad"
                maxLength={4}
                textAlign="center"
                returnKeyType="next"
                onSubmitEditing={() => heightInputRef.current?.focus()}
              />
            </View>
          </View>
        </FieldGroup>

        <FieldGroup label="Units">
          <SegmentedControl
            options={UNIT_OPTIONS}
            value={unitSystem}
            onChange={handleUnitChange}
            accessibilityLabel="Units"
          />
        </FieldGroup>

        <View style={styles.measureRow}>
          <View style={styles.measureItem}>
            <TextField
              label="Height"
              suffix={limits.height.unit}
              inputRef={heightInputRef}
              value={height}
              onChangeText={(text) => setHeight(sanitizeDecimal(text))}
              error={showError("height")}
              placeholder={PLACEHOLDERS[unitSystem].height}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => weightInputRef.current?.focus()}
            />
          </View>
          <View style={styles.measureItem}>
            <TextField
              label="Weight"
              suffix={limits.weight.unit}
              inputRef={weightInputRef}
              value={weight}
              onChangeText={(text) => setWeight(sanitizeDecimal(text))}
              error={showError("weight")}
              placeholder={PLACEHOLDERS[unitSystem].weight}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateShort: {
    flex: 1,
  },
  dateLong: {
    flex: 1.6,
  },
  measureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  measureItem: {
    flex: 1,
  },
});