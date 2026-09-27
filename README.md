# CC 프론트엔드

독립 창작 굿즈 커머스의 구매자, 창작자, 운영자 화면입니다. Next.js App Router와 React, TypeScript를 사용하며 기존 Spring Gateway에 연결합니다.

## 로컬 실행

Node.js 24 LTS와 pnpm 11을 사용합니다. 확인한 버전은 `.nvmrc`와 `package.json`에 기록했습니다.

```sh
cd /Users/bongchunan/bong_chun/Development/NBC/project/final/cc-frontend
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

이미 `.env.local`이 있다면 복사하지 말고 기존 설정을 확인하세요. 개발 서버는 [http://127.0.0.1:3001](http://127.0.0.1:3001)에서 열립니다. Gateway 기본 주소는 `http://localhost:8080`입니다. 백엔드 실행과 데이터 준비는 기존 `cc-service`의 안내를 따릅니다.

| 설정                    | 용도                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| `GATEWAY_URL`           | Next.js 서버에서 접근할 Gateway 주소. `/api/v1`을 붙이지 않음            |
| `APP_ORIGIN`            | 브라우저로 접속하는 프론트 주소. 변경 요청의 출처 확인과 공유 URL에 사용 |
| `PRODUCT_IMAGE_ORIGINS` | 이미지 최적화를 허용할 HTTPS 저장소 주소. 여러 주소는 쉼표로 구분        |

`localhost`와 `127.0.0.1`은 서로 다른 출처입니다. 접속 호스트나 포트를 바꾸면 `APP_ORIGIN`도 맞추고 서버를 재시작하세요. 운영 환경은 HTTPS 주소를 사용하고, 공유 URL 및 이미지 설정을 반영한 뒤 빌드해야 합니다. 허용 목록에 없는 상품 이미지는 최적화 프록시를 거치지 않고 원본으로 표시합니다.

## 화면

| 영역             | 진입 경로                                                              | 대상                                                    |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| 상점             | `/`, `/products`, `/products/[id]`, `/trends`, `/creators`, `/coupons` | 공개 탐색. 일부 조회는 현재 Gateway에서 로그인 요구     |
| 구매             | `/cart`, `/checkout`, `/payment/[number]`                              | CUSTOMER                                                |
| 마이페이지       | `/account`                                                             | 로그인 사용자. 주문, 쿠폰, 찜, 팔로우와 후기는 CUSTOMER |
| 창작자 센터      | `/studio`                                                              | CREATOR                                                 |
| 운영 콘솔        | `/admin`                                                               | MANAGER, MASTER                                         |
| 운영자 계정 생성 | `/admin/managers`                                                      | MASTER                                                  |

실제 백엔드 계정으로 로그인합니다. 창작자 가입 후에는 승인이 필요하며, 가입 완료 화면에서 승인 요청에 사용할 창작자번호를 확인할 수 있습니다. 프론트 실행 시 계정이나 상품을 자동으로 생성하지 않습니다.

결제는 현재 백엔드의 **모의 결제**입니다. 성공과 실패를 선택하는 화면이며 실제 결제수단에 청구하지 않습니다. 조회가 실패하거나 상품이 없으면 오류 또는 빈 상태를 표시하며 예시 데이터로 자동 대체하지 않습니다.

## 검증 명령

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

브라우저 검사는 먼저 운영 빌드를 만들고 실행합니다. 로컬에서는 설치된 Google Chrome을 사용합니다. CI는 `pnpm exec playwright install --with-deps chromium`으로 설치한 Chromium을 사용합니다.

E2E 검사는 `3101` 포트의 프론트와 `18181` 포트의 테스트용 Gateway를 실행하고 종료합니다. 이 포트를 비워 두세요. `tests/mock-gateway.mjs`의 데이터와 계정은 테스트에만 사용하며 실제 Spring 서비스에는 요청하지 않습니다. 로컬 미리보기는 `.env.local`에 지정한 실제 Gateway를 사용합니다.

```sh
pnpm build
pnpm start
```

위 명령은 운영 모드 실행 확인용입니다. 운영 모드의 인증 쿠키는 Secure이므로 실제 서비스는 HTTPS에서 실행해야 합니다. 배포 자동화와 실제 환경 배포는 이 작업에 포함하지 않았습니다.

## 구성

- `src/app`에 페이지, 서버 렌더링과 BFF 라우트 배치
- `src/features`에 구매, 계정, 창작자와 운영 화면 배치
- `src/components`에 공통 레이아웃, 입력과 조회 상태 배치
- `src/lib`에 API 명세 타입, 인증, 접근 제어와 입력 검증 배치
- `public/images/brand`에 사용자 제공 이미지 8개 보관
- `tests`에 핵심 로직, 폼과 브라우저 흐름 검증 배치

JWT는 HttpOnly 쿠키에 보관합니다. BFF가 허용된 API와 역할을 확인하며 실제 소유권, 금액과 재고의 최종 검증은 백엔드가 수행합니다. 개인정보와 상품 조회 응답에는 공유 캐시를 사용하지 않습니다.

## 문서

- [승인된 구현 계획](docs/implementation-plan.md)
- [구현 현황과 검증 결과](docs/implementation-status.md)
- [로컬 이슈 초안](<docs/issues/2026-09-21 frontend-implementation.md>)

현재 로컬 문서는 `docs/`에 저장했으며 `.gitignore` 대상입니다. 문서를 저장소에 게시할 때는 추적 여부를 별도로 정해야 합니다. Pretendard 글꼴의 라이선스는 `public/fonts/OFL.txt`에 보관했습니다.

## 로컬 예시 상품

2026-09-21 로컬 Gateway에 창작자 상점 4개, 상품 12개, 옵션 24개를 추가했습니다. 머그, 캔버스 백, 노트, 키링, 화병, 아트 프린트, 파우치, 트레이, 스티커, 쿠션, 문진과 인센스 홀더로 구성됩니다.

상점과 상품은 화면 시연을 위한 가상 카탈로그이며 사진은 AI로 생성했습니다. 실존 브랜드의 판매 정보가 아닙니다. 가격과 설명은 `scripts/catalog.json`, 이미지 원본은 `public/images/catalog`에 보관합니다. 평점과 구매 후기는 만들지 않았습니다.

```sh
node scripts/seed-catalog.mjs
node scripts/seed-catalog.mjs --apply
node scripts/seed-catalog.mjs --verify
```

기본 실행은 파일만 검사합니다. `--apply`는 목적지가 고정된 `http://127.0.0.1:8080`의 기존 가입, 승인, 상품 등록 API를 사용합니다. 이미지는 로컬 상품 서비스에 설정된 R2 저장소로 업로드됩니다. 로컬 부하 테스트용 MASTER 계정을 사용하며 필요하면 `LOCAL_MASTER_EMAIL`, `LOCAL_MASTER_PASSWORD`로 변경할 수 있습니다.

새 창작자 계정의 임의 비밀번호와 등록된 ID는 Git에서 제외되는 `.local/catalog-state.json`에 저장합니다. 이 파일은 공유하지 마세요. 같은 상태 파일로 다시 실행하면 등록된 상품을 건너뜁니다. `--verify`는 상품 설명, SKU 가격과 이미지 응답을 검사합니다. 기존 상품과 주문은 변경하지 않았으므로 뒤쪽 페이지나 검색에는 기존 부하 테스트 상품이 남아 있습니다.
