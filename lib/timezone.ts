// 19번 요구사항: "당일"은 학원 운영 타임존(기본 Asia/Seoul) 기준으로 판정한다.
// 서버의 UTC 날짜를 그대로 비교하지 않는다. 이 파일이 날짜 판단의 단일 진실 공급원이며,
// 서버 코드 어디에서도 이 함수를 거치지 않고 직접 `new Date()`로 날짜를 비교하지 않는다.

const ACADEMY_TIMEZONE = "Asia/Seoul";

/** 학원 운영 타임존 기준 "오늘" 날짜를 YYYY-MM-DD 문자열로 반환한다. */
export function getAcademyToday(now: Date = new Date()): string {
  // Intl.DateTimeFormat은 타임존 변환을 표준 라이브러리로 안전하게 처리한다.
  // (Node.js의 full-icu 빌드 필요 — 공식 Node.js 배포판은 기본 포함, 확인 필요 없음)
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // en-CA 로케일은 YYYY-MM-DD 형식을 반환
}

/** 주어진 checklist_date(YYYY-MM-DD 또는 Date)가 학원 기준 오늘인지 서버에서 판정한다. */
export function isAcademyToday(checklistDate: string | Date, now: Date = new Date()): boolean {
  const dateStr =
    typeof checklistDate === "string"
      ? checklistDate.slice(0, 10)
      : getAcademyToday(checklistDate);
  return dateStr === getAcademyToday(now);
}
