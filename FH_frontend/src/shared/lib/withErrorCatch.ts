import { logger } from "./logger";

export const withErrorCatch = <T,>(importFunc: () => Promise<T>) => {
  return importFunc().catch((err) => {
    logger.error("Failed to dynamically load chunk", err);
    throw new Error(
      "페이지를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해주세요.",
    );
  });
};
