This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# ######################################################################### #

mkdir ruramed-frontend
cd ruramed-frontend
npx create-next-app@latest .


npm install axios
npm install js-cookie
npm install @heroicons/react
npm install react-hot-toast
npm install date-fns


npm install axios js-cookie
npm install --save-dev @types/js-cookie
npm install lucide-react
npm install clsx tailwind-merge
npm install zustand
npm install react-hot-toast


cd src
mkdir api components contexts hooks utils types
cd api
echo. > client.ts
echo. > auth.ts
echo. > medicines.ts
echo. > orders.ts
echo. > doctors.ts
cd ..
cd contexts
echo. > AuthContext.tsx
cd ..
cd utils
echo. > storage.ts
echo. > constants.ts
cd ..
cd types
echo. > index.ts
cd ..\..

echo NEXT_PUBLIC_API_URL=http://localhost:5000/api > .env.local
echo NEXT_PUBLIC_BASE_URL=http://localhost:3000 >> .env.local

