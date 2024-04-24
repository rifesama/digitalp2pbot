/**
 *
 * @param text - The text to be sanitized
 * @returns The sanitized text 
 */
export const sanitizeMD = (text: string | null | undefined): string => {
    if (!text) return "";

    // Correctly escapes special Markdown characters to prevent unwanted formatting
    // and avoids escaping already escaped characters.
    return text.toString().replace(/(\\)?([|<>(){}[\]\-_!#.`=+])/g, (match, escaped, char) => {
        // If the character is already escaped (preceded by a backslash), return the match
        if (escaped) {
            return match;
        }
        // Otherwise, escape the special character
        return `\\${char}`;
    });
};

/*
* Returns a string with a number of stars equal to the rounded rate
* @param rate - The rate to be converted to stars
* @returns A string with a number of stars equal to the rounded rate
* */
export const getEmojiRate = (rate: number): string => {
    const star = '⭐';
    const roundedRate = Math.round(rate);
    const output: string[] = [];
    for (let i = 0; i < roundedRate; i++) {
        output.push(star);
    }

    return output.join('');
};

export const decimalRound = (value: number, exp: number): number => {
  // Handle the case where `exp` is undefined or zero.
  if (typeof exp === 'undefined' || +exp === 0) {
    return Math.round(value);
  }

  // Convert both `value` and `exp` to numbers to ensure all operations are numeric
  value = +value;
  exp = +exp;

  // Return NaN if value is NaN or exp is not an integer
  if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
    return NaN;
  }

  // Shift the decimal point in `value` by `-exp` places
  let valueParts = value.toString().split('e');
  value = Math.round(+(valueParts[0] + 'e' + (valueParts[1] ? (+valueParts[1] - exp) : -exp)));

  // Shift the decimal point back to its original place
  valueParts = value.toString().split('e');
  return +(valueParts[0] + 'e' + (valueParts[1] ? (+valueParts[1] + exp) : exp));
};

export const getStars = (rate: number, totalReviews: number): string => {
  const stars = getEmojiRate(rate);
  const roundedRating = decimalRound(rate, -1);

  return `${roundedRating} ${stars} (${totalReviews})`;
};
