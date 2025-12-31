
export const getMaterialConfig = () => {
    const label = process.env.NEXT_PUBLIC_MATERIAL_LABEL;

    // If explicitly set to 'HIDDEN' (case insensitive), we hide it.
    const isVisible = label?.toUpperCase() !== 'HIDDEN';

    // If label is set and not hidden, use it. Otherwise default to 'Materiál'.
    // If it is hidden, we return an empty string or the default, but isVisible is false.
    const displayLabel = (isVisible && label) ? label : 'Materiál';

    return {
        isVisible,
        label: displayLabel,
        // Helper to format "Zisk z [Material]" or "Profit from [Material]"
        // e.g. "Zisk z materiálu" -> "Zisk z zboží".
        // For now, we will just provide the raw label and let components compose it,
        // or provide a lowercase variant if needed.
        labelLowercase: displayLabel.toLowerCase(),
    };
};
