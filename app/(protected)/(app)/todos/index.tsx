import { useLiveQuery } from "@tanstack/react-db";
import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { normalizeWhitespace } from "@/src/components/form/normalize-whitespace";
import { useRowSeparatorStyle } from "@/src/components/ui/list-separator";
import { todosCollection } from "@/src/powersync/collections";

export default function TodosIndexScreen() {
  const [title, setTitle] = useState("");
  const rowSeparatorStyle = useRowSeparatorStyle("top");

  const { data: todos = [] } = useLiveQuery((q) =>
    q.from({ todo: todosCollection }).orderBy(({ todo }) => todo.updated_at, "desc"),
  );

  function handleCreate() {
    const text = title.trim();
    if (!text) {
      return;
    }
    todosCollection.insert({
      id: randomUUID(),
      title: text,
      completed: 0,
      list_id: "f7e5d8d3-b5a9-4446-9a1d-bba21e4c4519",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setTitle("");
  }

  function handleToggle(id: string, completed: number | null | undefined) {
    todosCollection.update(id, (draft) => {
      draft.completed = completed ? 0 : 1;
      draft.updated_at = new Date().toISOString();
    });
  }

  function handleDelete(id: string) {
    todosCollection.delete(id);
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          <View>
            <Text className="text-lg font-semibold">Lists</Text>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <TextInput
              value={title}
              onBlur={() => setTitle(normalizeWhitespace(title, { trim: true }))}
              onChangeText={(text) => setTitle(normalizeWhitespace(text))}
              placeholder="New todo item..."
              className="flex-1 rounded border border-gray-300 px-3 py-2"
              returnKeyType="done"
            />
            <Pressable
              onPress={handleCreate}
              className="rounded bg-blue-600 px-4 py-2 disabled:opacity-50"
            >
              <Text className="font-medium text-white">Save changes</Text>
            </Pressable>
          </View>

          {todos.length === 0 ? (
            <View>
              <Text className="mt-6 text-gray-500">No lists yet. Create one above.</Text>
            </View>
          ) : (
            <View className="py-6">
              {todos.map((todo) => (
                <View key={todo.id} style={rowSeparatorStyle} className="py-4">
                  <View className="flex flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">
                        {new Date(todo.updated_at || "").toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }) || "Not applicable"}
                      </Text>
                    </View>
                    <View>
                      <View className="mt-1 flex flex-row gap-1">
                        <View
                          className={`rounded-xs bg-yellow-100 px-1.5 py-0.5 ${todo.$origin === "remote" ? "bg-yellow-100" : "bg-gray-100"}`}
                        >
                          <Text
                            className={`text-xs capitalize ${todo.$origin === "remote" ? "text-yellow-700" : "text-gray-700"}`}
                          >
                            {todo.$origin}
                          </Text>
                        </View>

                        <View className="rounded-xs bg-green-100 px-1.5 py-0.5">
                          <Text className="text-xs text-green-700">
                            {todo.$synced ? "Sync" : "Not synced"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View>
                    <Text className="text-base font-bold">{todo.title}</Text>
                  </View>

                  <View className="mt-1 flex-row gap-3">
                    <Pressable onPress={() => handleToggle(todo.id, todo.completed)}>
                      <Text
                        className={`text-sm font-normal ${todo.completed ? "text-gray-500" : "text-green-600"}`}
                      >
                        {todo.completed ? "Mark open" : "Mark done"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(todo.id)}>
                      <Text className="font-medium text-red-600">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
