// 보스턴영어 학생용 화면 공통 디자인 토큰
export const colors = {
  navy: "#152A54",
  blue: "#2F6FEB",
  blueDark: "#2757D6",
  blueLight: "#EAF1FF",
  blueGradient: "linear-gradient(135deg, #4E8CFB 0%, #2757D6 100%)",
  green: "#22B573",
  greenLight: "#E7F8EE",
  pink: "#FF5A75",
  pinkGradient: "linear-gradient(135deg, #FF7A8A 0%, #FF4D6D 100%)",
  purple: "#7C6CF0",
  purpleLight: "#EFEBFF",
  orange: "#F5A623",
  orangeLight: "#FFF3E0",
  bg: "#F5F7FB",
  card: "#FFFFFF",
  textPrimary: "#16213E",
  textSecondary: "#8A94A6",
  textMuted: "#B7BFCC",
  border: "#EEF1F6",
};

export const fontFamily =
  "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";

export const pageStyle: React.CSSProperties = {
  fontFamily,
  background: colors.bg,
  minHeight: "100vh",
  color: colors.textPrimary,
};

export const contentStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: "0 auto",
  padding: "20px 16px 100px",
  boxSizing: "border-box",
};

export type ItemLike = {
  hasCheck: boolean;
  hasCount: boolean;
  hasScore: boolean;
  hasPhotoSubmission: boolean;
  hasAudioSubmission: boolean;
  hasVideoSubmission: boolean;
  hasFileSubmission: boolean;
};

// 활동 성격에 따라 홈/목록 화면에 쓸 아이콘·배경색을 정한다.
export function getItemVisual(item: ItemLike): { emoji: string; bg: string } {
  if (item.hasScore) return { emoji: "📖", bg: colors.purpleLight };
  if (item.hasVideoSubmission) return { emoji: "🎬", bg: "#FFE4E9" };
  if (item.hasAudioSubmission) return { emoji: "🎵", bg: "#FFE4E9" };
  if (item.hasPhotoSubmission) return { emoji: "📷", bg: colors.blueLight };
  if (item.hasFileSubmission) return { emoji: "📎", bg: colors.blueLight };
  if (item.hasCount) return { emoji: "📘", bg: colors.orangeLight };
  return { emoji: "✏️", bg: colors.greenLight };
}

// 이 항목이 "제출형"(사진/음성/영상/파일)인지, "학습형"(체크/횟수/점수)인지 구분한다.
export function isSubmissionItem(item: ItemLike): boolean {
  return (
    (item.hasPhotoSubmission || item.hasAudioSubmission || item.hasVideoSubmission || item.hasFileSubmission) &&
    !item.hasCheck &&
    !item.hasCount &&
    !item.hasScore
  );
}
