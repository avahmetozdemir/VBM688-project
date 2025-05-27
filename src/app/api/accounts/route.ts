import { NextResponse } from "next/server";
import { INITIAL_ACCOUNTS } from "@/lib/types";

// Demo veriler
let accounts = [...INITIAL_ACCOUNTS];

export async function GET() {
  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const { accounts: newAccounts } = await req.json();
  accounts = newAccounts;
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const { userId, amount, type } = await req.json();
  const account = accounts.find((acc) => acc.id === userId);

  if (!account) {
    return NextResponse.json({ error: "Hesap bulunamadı" }, { status: 404 });
  }

  if (type === "WITHDRAW" && account.balance < amount) {
    return NextResponse.json({ error: "Yetersiz bakiye" }, { status: 400 });
  }

  account.balance += type === "DEPOSIT" ? amount : -amount;

  return NextResponse.json({ success: true, account });
}

export async function DELETE() {
  accounts = [...INITIAL_ACCOUNTS];
  return NextResponse.json({ success: true });
}
