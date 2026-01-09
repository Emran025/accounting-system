<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentsController extends Controller
{
    public function index(Request $request)
    {
        $query = Department::with('manager');
        if ($request->has('search')) {
            $query->where('name_ar', 'like', '%' . $request->search . '%')
                  ->orWhere('name_en', 'like', '%' . $request->search . '%');
        }
        return response()->json($query->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_ar' => 'required|string|max:100',
            'name_en' => 'nullable|string|max:100',
            'manager_id' => 'nullable|exists:employees,id'
        ]);

        $department = Department::create($validated);
        return response()->json($department, 201);
    }

    public function show($id)
    {
        return Department::with('manager')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $department = Department::findOrFail($id);
        $department->update($request->all());
        return response()->json($department);
    }

    public function destroy($id)
    {
        Department::destroy($id);
        return response()->json(null, 204);
    }
}
