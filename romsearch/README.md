# ROMSearch (Arcade Finder)

MAME 게임명 또는 ROM ID를 한 번 입력해 **MDK.CAB, Emu-Land, RomsDL**의 검색 결과를 한 화면에 표시하는 웹 도구입니다.

검색 결과에는 게임 제목과 해당 사이트의 실제 상세 페이지 링크가 표시됩니다. 브라우저에서 외부 사이트의 광고 스크립트나 이미지를 검색 화면으로 불러오지 않습니다.

## 기능

- 게임 제목과 `sfiii3`, `kof98` 같은 MAME ROM ID 검색
- 세 사이트의 실시간 검색 결과를 출처별로 표시
- 각 결과에서 해당 게임의 원본 상세 페이지로 이동
- 사이트별 검색 선택 및 브라우저의 최근 검색 저장
- ROM ID로 검색했는데 RomsDL의 결과가 없으면, 다른 출처에서 확인한 게임명으로 한 번 재검색
- 개별 출처가 연결을 차단하거나 오류를 반환할 때 오류 상태 표시

> ROM 바이너리는 제공하거나 저장하지 않습니다. 상세 페이지에서의 다운로드 가능 여부, 파일 안전성 및 배포 권한은 각 출처에서 확인해야 합니다.

## 파일 구성

| 경로 | 내용 |
| --- | --- |
| `web/index.html` | 검색 UI (HTML/CSS/JavaScript) |
| `worker/index.js` | 서버 검색 API 및 사이트별 HTML 결과 파서 |
| `scripts/build.mjs` | HTML을 Worker 모듈에 포함하는 빌드 |
| `scripts/test.mjs` | 파서·검색 API 모의 응답 테스트 |
| `.openai/hosting.json` | ChatGPT Sites용 기본 Worker 설정 (프로젝트 ID 제외) |

## 테스트 및 빌드

Node.js 22 이상 기준이며, 외부 npm 패키지 설치는 필요하지 않습니다.

```bash
npm test
npm run build
```

빌드하면 `dist/server/index.js`와 `dist/.openai/hosting.json`이 생성됩니다. `dist/server/index.js`는 Cloudflare Workers 호환 ESM 엔트리포인트이며, `GET /`과 `GET /api/search?q=sfiii3&sites=mdk,emu,roms`를 처리합니다.

ChatGPT Sites로 재배포하려면 별도의 Site를 만들고 해당 프로젝트의 `project_id`를 `.openai/hosting.json`에 등록한 뒤 빌드·배포해야 합니다. 개인 배포 ID나 자격 증명은 이 저장소에 포함하지 않았습니다.

## 참고

- 세 출처는 공식 검색 API 대신 공개 웹페이지의 HTML을 사용하므로, 검색 페이지 구조가 바뀌면 파서 수정이 필요할 수 있습니다.
- 외부 사이트의 자동 접근 제한이나 일시적 장애로 일부 검색 결과가 누락될 수 있습니다.
- 외부 상세 페이지의 광고는 이 도구가 제어하지 않습니다. 사용자의 브라우저 광고 차단 설정이 별도로 적용됩니다.
