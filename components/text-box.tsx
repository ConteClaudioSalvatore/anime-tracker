import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

export function TextBox(props: Readonly<TextInputProps>) {
  const colorScheme = useColorScheme();

  return (
    <TextInput
      {...props}
      style={StyleSheet.compose(props.style, {
        ...styles.input,
        ...(colorScheme === "light" ? styles.inputLight : styles.inputDark),
      })}
    />
  );
}

const styles = StyleSheet.create({
  inputDark: {
    backgroundColor: "rgb(255,255,255, .6)",
  },
  inputLight: {
    backgroundColor: "rgb(0,0,0, .16)",
  },
  input: {
    padding: 8,
    height: 40,
    borderRadius: 16,
    borderCurve: "continuous",
    fontSize: 20,
    elevation: 1,
  },
});
