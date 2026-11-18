EKGUI 0.289.11 사용설명서 추가 패키지

원본 PDF: EKGUI 0.289.11 _ 네이버 카페.pdf (4페이지)
추출 이미지: 총 9개 (기능 화면 8개 + 게시글 프로필 이미지 1개)
문서 섹션: section_028911.html
적용 스크립트: apply_to_guide.py

적용 방법
1. EKMAME_IPS 저장소를 로컬에서 준비합니다.
2. 이 압축 파일을 해제합니다.
3. python apply_to_guide.py "D:\경로\EKMAME_IPS\guide" 를 실행합니다.
4. git diff -- guide/index.html guide/README.md 로 변경 사항을 확인합니다.
5. 이미지 9개 추가 여부를 확인한 뒤 커밋·푸시합니다.

적용 시 index.html.before-028911.bak 및 README.md.before-028911.bak 백업을 만듭니다.
기능 화면 8개는 모두 가이드에 이미지 확대 링크와 함께 삽입됩니다.
프로필 아바타 1개도 보존하지만 사용설명서 본문에는 노출하지 않습니다.
실제 프로그램 실행이나 배포 검증은 포함되지 않습니다.
