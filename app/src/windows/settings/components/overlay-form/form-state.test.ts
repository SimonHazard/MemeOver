import { expect, test } from "bun:test";
import { FieldApi, FormApi } from "@tanstack/react-form";

test("saved values become the new baseline; reverting an edit clears unsaved state", async () => {
	const form = new FormApi({ defaultValues: { mediaSize: 40 }, onSubmit: () => {} });
	const unmount = form.mount();
	const field = new FieldApi({ form, name: "mediaSize" });
	const unmountField = field.mount();
	try {
		expect(form.state.isDefaultValue).toBe(true);
		form.setFieldValue("mediaSize", 50);
		expect(form.state.isDefaultValue).toBe(false);
		await form.handleSubmit();
		form.reset(form.state.values);
		expect(form.state.isDefaultValue).toBe(true);
		form.setFieldValue("mediaSize", 60);
		expect(form.state.isDefaultValue).toBe(false);
		form.setFieldValue("mediaSize", 50);
		expect(form.state.isDefaultValue).toBe(true);
		form.setFieldValue("mediaSize", 60);
		form.reset();
		expect(form.state.values.mediaSize).toBe(50);
	} finally {
		unmountField();
		unmount();
	}
});

test("failed persistence keeps edits and does not permit save-and-leave", async () => {
	let fail = true;
	const form = new FormApi({
		defaultValues: { mediaSize: 40 },
		onSubmit: async ({ value }) => {
			if (fail) throw new Error("Persistence failed");
			form.reset(value);
		},
	});
	const unmount = form.mount();
	const field = new FieldApi({ form, name: "mediaSize" });
	const unmountField = field.mount();
	try {
		form.setFieldValue("mediaSize", 50);
		await expect(form.handleSubmit()).rejects.toThrow("Persistence failed");
		expect(form.state.isDefaultValue).toBe(false);
		expect(form.state.values.mediaSize).toBe(50);
		expect(form.state.isSubmitSuccessful).toBe(false);
		fail = false;
		await form.handleSubmit();
		expect(form.state.isDefaultValue).toBe(true);
		expect(form.state.isSubmitSuccessful).toBe(true);
	} finally {
		unmountField();
		unmount();
	}
});
