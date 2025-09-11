import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/server-auth';
import { 
  getDynamicLists,
  addKeyword,
  addProblem,
  addDepartment,
  removeKeyword,
  removeProblem,
  removeDepartment,
  editKeyword,
  editProblem,
  editDepartment,
  addKeywordWithUser
} from '@/lib/dynamic-lists-service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userData) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Qualquer usuário autenticado pode visualizar as listas
    const lists = await getDynamicLists();
    return NextResponse.json(lists);
  } catch (error) {
    console.error('Erro ao buscar listas dinâmicas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userData) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Qualquer usuário autenticado pode modificar as listas (alterações são globais)

    const body = await request.json();
    const { action, type, item, newItem } = body;

    const userInfo = {
      uid: authResult.userData.uid,
      name: authResult.userData.name,
      email: authResult.userData.email
    };

    let success = false;

    switch (action) {
      case 'add':
        switch (type) {
          case 'keyword':
            success = await addKeyword(item);
            break;
          case 'problem':
            success = await addProblem(item);
            break;
          case 'department':
            success = await addDepartment(item);
            break;
        }
        break;

      case 'remove':
        switch (type) {
          case 'keyword':
            success = await removeKeyword(item);
            break;
          case 'problem':
            success = await removeProblem(item);
            break;
          case 'department':
            success = await removeDepartment(item);
            break;
        }
        break;

      case 'edit':
        switch (type) {
          case 'keyword':
            success = await editKeyword(item, newItem);
            break;
          case 'problem':
            success = await editProblem(item, newItem);
            break;
          case 'department':
            success = await editDepartment(item, newItem);
            break;
        }
        break;

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Operação falhou' }, { status: 400 });
    }

  } catch (error) {
    console.error('Erro na operação de lista dinâmica:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
