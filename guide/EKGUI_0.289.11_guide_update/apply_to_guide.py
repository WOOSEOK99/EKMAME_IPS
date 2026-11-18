#!/usr/bin/env python3
"""EKMAME_IPS/guide에 0.289.11 업데이트 적용. 기존 파일은 최소 변경하며 원본 백업을 생성."""
from pathlib import Path
import shutil,sys,re
here=Path(__file__).resolve().parent
if len(sys.argv)!=2:
    raise SystemExit('사용법: python apply_to_guide.py <EKMAME_IPS 저장소의 guide 폴더 경로>')
guide=Path(sys.argv[1]).expanduser().resolve()
index=guide/'index.html'; readme=guide/'README.md'
if not index.is_file() or not readme.is_file():
    raise SystemExit(f'guide/index.html 및 guide/README.md가 필요합니다: {guide}')
with index.open('r',encoding='utf-8',newline='') as f:old=f.read()
newline='\r\n' if '\r\n' in old else '\n'
nav='        <a href="#v028911"><span>14</span> 0.289.11 업데이트</a>'
fragment=(here/'section_028911.html').read_text(encoding='utf-8')
if 'id="v028911"' in old:
    raise SystemExit('0.289.11 문서가 이미 추가되어 있습니다. 중복 삽입하지 않았습니다.')
# 콘솔 항목 바로 다음에 번호 14 추가
needle='        <a href="#console"><span>13</span> 콘솔 게임 사용법</a>'
if old.count(needle)!=1:raise SystemExit('기존 목차 구조가 달라 자동 변경을 중단했습니다.')
new=old.replace(needle,needle+newline+nav,1)
# main 종결 직전: 문서 순서를 유지하면서 업데이트 섹션 추가
anchor='    </main>'
if new.count(anchor)!=1:raise SystemExit('메인 문서 종료 위치를 찾지 못했습니다.')
new=new.replace(anchor,newline+fragment.replace('\n',newline)+newline+anchor,1)
if './images/v028911-page1-02.webp' not in new:raise SystemExit('이미지 참조 삽입에 실패했습니다.')
imgs=list((here/'images').glob('v028911-page*.webp'))
if len(imgs)!=9:raise SystemExit(f'원본 이미지 9개가 필요합니다. 현재 {len(imgs)}개')
refs=set(re.findall(r'\./images/(v028911-[^" ]+\.webp)',fragment))
if len(refs)!=8 or any(not (here/'images'/r).is_file() for r in refs):
    raise SystemExit('본문 이미지 8개가 모두 준비되지 않았습니다.')
for img in imgs:
    dst=guide/'images'/img.name
    if dst.exists():raise SystemExit(f'동일 이름 이미지가 존재하여 중단했습니다: {dst}')
# 변경 준비가 모두 끝난 뒤 백업 및 적용
for p in [index,readme]:
    bak=p.with_suffix(p.suffix+'.before-028911.bak')
    if bak.exists():raise SystemExit(f'기존 백업 파일이 있어 중단했습니다: {bak}')
for p in [index,readme]:shutil.copy2(p,p.with_suffix(p.suffix+'.before-028911.bak'))
(guide/'images').mkdir(exist_ok=True)
for img in imgs:
    dst=guide/'images'/img.name
    shutil.copy2(img,dst)
with index.open('w',encoding='utf-8',newline='') as f:f.write(new)
with readme.open('rb') as f:readme_newline = b'\r\n' if b'\r\n' in f.read() else b'\n'
with readme.open('a',encoding='utf-8',newline='') as f:
    add = lambda x: f.write(x.replace('\n', readme_newline.decode('ascii')))
    add('\n## 0.289.11 추가 안내 (2026-11-18)\n\n')
    add('버추어 파이터 네이티브 엔진, MSX/MSX2, 자동연사 확장, 영상 다운로드, 해킹 ROM 2종, 한국어 UI 개선을 설명서 14번 항목에 추가했습니다.\n')
    add('기능 화면 이미지 8개를 본문에 포함했고, PDF에 포함된 게시글 프로필 이미지 1개도 누락 없이 보관했습니다.\n')
    add('원본: https://cafe.naver.com/f-e/cafes/10347637/articles/33003\n')
print('완료:',guide,'본문 이미지 8개, 원본 이미지 9개 보관, index.html / README.md 업데이트')
