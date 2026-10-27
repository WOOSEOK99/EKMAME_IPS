# EKMAME_IPS

EKMAME용 IPS 패치 배포 저장소입니다.

## GitHub Pages

이 저장소의 `main` 브랜치 루트를 GitHub Pages로 게시하면 패치 검색/선택/다운로드 페이지가 표시됩니다.

## 파일 구성

- `index.html` — 메인 페이지
- `assets/style.css` — 디자인
- `assets/app.js` — 검색, 선택, 다운로드 기능
- `data/patches.json` — 패치 목록

## patches.json 예시

```json
{
  "version": 1,
  "updated": "2026-10-07",
  "bundle_url": "https://github.com/WOOSEOK99/EKMAME_IPS/releases/download/latest/EKMAME_IPS_ALL.7z",
  "patches": [
    {
      "id": "orlengendcs01",
      "game": "Oriental Legend",
      "rom": "orlengendcs01",
      "title": "IPS Patch",
      "file": "orlengendcs01.7z",
      "size": 123456,
      "updated": "2026-10-07",
      "download_url": "https://github.com/WOOSEOK99/EKMAME_IPS/releases/download/latest/orlengendcs01.7z"
    }
  ]
}
```

`size` 값은 바이트 단위입니다. `bundle_url`을 지정하면 사이트의 **전체 다운로드** 버튼이 활성화됩니다.

## 배포 권장 방식

홈페이지 파일은 저장소에 두고 실제 7z 패치 파일은 GitHub Releases의 asset으로 배포하는 방식을 권장합니다.

원본 ROM/CHD 파일은 이 저장소에서 제공하지 않습니다.
