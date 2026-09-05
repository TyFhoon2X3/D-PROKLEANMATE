'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TaskPage() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // 1. READ: ดึงข้อมูลทั้งหมด
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('id', { ascending: true });

    if (!error) setTasks(data || []);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 2. CREATE: เพิ่มข้อมูลใหม่
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const { error } = await supabase.from('tasks').insert([{ title }]);

    if (!error) {
      setTitle('');
      fetchTasks();
    }
  };

  // 3. UPDATE: แก้ไขข้อมูลตาม id
  const handleUpdate = async (id) => {
    if (!editText.trim()) return;

    const { error } = await supabase
      .from('tasks')
      .update({ title: editText })
      .eq('id', id);

    if (!error) {
      setEditingId(null);
      setEditText('');
      fetchTasks();
    }
  };

  // 4. DELETE: ลบข้อมูลตาม id
  const handleDelete = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (!error) {
      fetchTasks();
    }
  };

  return (
    <main className="max-w-xl mx-auto p-6 text-white min-h-screen bg-neutral-900">
      <h1 className="text-2xl font-bold mb-6 text-center">D-PROKLEANMATE : Tasks CRUD</h1>

      {/* แบบฟอร์มเพิ่มข้อมูล (CREATE) */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="พิมพ์ชื่องานใหม่..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 p-2 rounded bg-neutral-800 border border-neutral-700 text-white outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition"
        >
          เพิ่มงาน
        </button>
      </form>

      {/* รายการข้อมูล (READ, UPDATE, DELETE) */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-3 bg-neutral-800 rounded border border-neutral-700"
          >
            {editingId === task.id ? (
              <div className="flex gap-2 flex-1 mr-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 p-1 rounded bg-neutral-700 border border-neutral-600 text-white outline-none"
                />
                <button
                  onClick={() => handleUpdate(task.id)}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="bg-neutral-600 hover:bg-neutral-500 px-3 py-1 rounded text-sm font-medium"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <>
                <span className="text-neutral-200">{task.title}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(task.id);
                      setEditText(task.title);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded text-sm font-medium"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium"
                  >
                    ลบ
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {tasks.length === 0 && (
          <p className="text-center text-neutral-500 py-4">ยังไม่มีรายการงาน</p>
        )}
      </div>
    </main>
  );
}