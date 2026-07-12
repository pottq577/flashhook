package com.flashhook.domain.admin.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class IpAddressValidator
    implements ConstraintValidator<IpAddress, String>
{

    private static final String IPV4_REGEX =
        "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
    // A simplified IPv6 regex that checks for hex groups separated by colons
    private static final String IPV6_REGEX =
        "^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|" +
        "^((?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4})*)?)::((?:[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4})*)?)$";

    private static final Pattern IPV4_PATTERN = Pattern.compile(IPV4_REGEX);
    private static final Pattern IPV6_PATTERN = Pattern.compile(IPV6_REGEX);

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return false;
        String normalized = value.trim();

        if (normalized.contains("::")) {
            String[] sides = normalized.split("::", -1);
            if (sides.length != 2) return false;
            int left = sides[0].isEmpty() ? 0 : sides[0].split(":").length;
            int right = sides[1].isEmpty() ? 0 : sides[1].split(":").length;
            if (left + right >= 8) return false;
        }

        return (
            IPV4_PATTERN.matcher(normalized).matches() ||
            IPV6_PATTERN.matcher(normalized).matches()
        );
    }
}
